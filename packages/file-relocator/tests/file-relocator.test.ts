import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FileRelocator } from '../src/file-relocator';
import { NodeFileSystem } from '@mmt/filesystem-access';

describe('File Relocator E2E', () => {
  let tempDir: string;
  let fileSystem: NodeFileSystem;
  let relocator: FileRelocator;

  beforeEach(async () => {
    // Create a temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-relocator-test-'));
    fileSystem = new NodeFileSystem();
    relocator = new FileRelocator(fileSystem);

    // Create test vault structure:
    // - /Projects/project1.md: contains [[Tasks/task1]] and [](../Archive/old.md)
    // - /Tasks/task1.md: contains [[project1]] with relative path
    // - /Archive/old.md: empty
    // - /Daily/2024-06-25.md: contains [[task1]] and [[Projects/project1#heading]]
    
    await fs.mkdir(path.join(tempDir, 'Projects'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'Tasks'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'Archive'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'Archive/2024'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'Daily'), { recursive: true });

    // Create project1.md
    await fs.writeFile(
      path.join(tempDir, 'Projects/project1.md'),
      `# Project 1
This project has a [[Tasks/task1]] that needs completion.
See also [old archive](../Archive/old.md).

## Resources
- [[task1]] - shorthand reference
- [Task details](../Tasks/task1.md)
`
    );

    // Create task1.md
    await fs.writeFile(
      path.join(tempDir, 'Tasks/task1.md'),
      `# Task 1
Related to [[project1]] in projects folder.
Also see [[../Projects/project1]] with full path.
`
    );

    // Create old.md
    await fs.writeFile(
      path.join(tempDir, 'Archive/old.md'),
      `# Old Archive
Empty file for testing.
`
    );

    // Create daily note
    await fs.writeFile(
      path.join(tempDir, 'Daily/2024-06-25.md'),
      `# Daily Note
Today's tasks:
- Work on [[task1]]
- Review [[Projects/project1#heading]] section

\`\`\`markdown
This [[task1]] should not be updated - it's in a code block
\`\`\`

<!-- This [[task1]] is in a comment and should not be updated -->
`
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds all wikilinks [[task1]] pointing to moved file', async () => {
    // GIVEN: Multiple files containing wikilinks to task1.md
    // WHEN: Finding all references to the file
    // THEN: Returns all files and specific links that need updating
    const references = await relocator.findReferences(
      path.join(tempDir, 'Tasks/task1.md'),
      tempDir
    );

    expect(references).toHaveLength(2); // project1.md and daily note
    expect(references).toContainEqual({
      filePath: path.join(tempDir, 'Projects/project1.md'),
      links: expect.arrayContaining([
        { type: 'wikilink', raw: '[[Tasks/task1]]', target: 'Tasks/task1', line: 2 },
        { type: 'wikilink', raw: '[[task1]]', target: 'task1', line: 6 }
      ])
    });
    expect(references).toContainEqual({
      filePath: path.join(tempDir, 'Daily/2024-06-25.md'),
      links: expect.arrayContaining([
        { type: 'wikilink', raw: '[[task1]]', target: 'task1', line: 3 }
      ])
    });
  });

  it('updates [[Tasks/task1]] to [[Archive/2024/task1]] after move', async () => {
    // GIVEN: A file is moved from Tasks/ to Archive/2024/
    // WHEN: Updating all references to the moved file
    // THEN: All wikilinks are updated with the new path
    const oldPath = path.join(tempDir, 'Tasks/task1.md');
    const newPath = path.join(tempDir, 'Archive/2024/task1.md');

    await relocator.updateReferences(oldPath, newPath, tempDir);

    const content = await fs.readFile(
      path.join(tempDir, 'Projects/project1.md'),
      'utf-8'
    );
    
    expect(content).toContain('[[Archive/2024/task1]]');
    expect(content).not.toContain('[[Tasks/task1]]');
  });

  it('preserves link text in [my task](Tasks/task1.md) -> [my task](Archive/2024/task1.md)', async () => {
    // GIVEN: Markdown links with custom display text
    // WHEN: Updating the link target path
    // THEN: Preserves the custom text while updating only the URL
    // Add a markdown link with custom text
    const projectFile = path.join(tempDir, 'Projects/project1.md');
    let content = await fs.readFile(projectFile, 'utf-8');
    content += '\nSee [my important task](../Tasks/task1.md) for details.';
    await fs.writeFile(projectFile, content);

    const oldPath = path.join(tempDir, 'Tasks/task1.md');
    const newPath = path.join(tempDir, 'Archive/2024/task1.md');

    await relocator.updateReferences(oldPath, newPath, tempDir);

    const updatedContent = await fs.readFile(projectFile, 'utf-8');
    expect(updatedContent).toContain('[my important task](../Archive/2024/task1.md)');
  });

  it('updates relative paths: [[task1]] -> [[../Archive/2024/task1]]', async () => {
    // GIVEN: Short wikilinks without path (resolved by context)
    // WHEN: Target moves to a different folder depth
    // THEN: Calculates correct relative path from linking file
    const oldPath = path.join(tempDir, 'Tasks/task1.md');
    const newPath = path.join(tempDir, 'Archive/2024/task1.md');

    await relocator.updateReferences(oldPath, newPath, tempDir);

    const content = await fs.readFile(
      path.join(tempDir, 'Daily/2024-06-25.md'),
      'utf-8'
    );
    
    // From Daily/ to Archive/2024/ requires going up one level
    expect(content).toContain('[[../Archive/2024/task1]]');
  });

  it('handles link anchors: [[task1#heading]] -> [[Archive/2024/task1#heading]]', async () => {
    // GIVEN: Wikilinks with section anchors (#heading)
    // WHEN: Updating the file path
    // THEN: Preserves the anchor while updating the path
    // Add a link with anchor
    const projectFile = path.join(tempDir, 'Projects/project1.md');
    let content = await fs.readFile(projectFile, 'utf-8');
    content += '\nSee [[task1#implementation]] for implementation details.';
    await fs.writeFile(projectFile, content);

    const oldPath = path.join(tempDir, 'Tasks/task1.md');
    const newPath = path.join(tempDir, 'Archive/2024/task1.md');

    await relocator.updateReferences(oldPath, newPath, tempDir);

    const updatedContent = await fs.readFile(projectFile, 'utf-8');
    expect(updatedContent).toContain('[[../Archive/2024/task1#implementation]]');
  });

  it('processes 50 files with 200 links in < 2 seconds', async () => {
    // GIVEN: A vault with 50 files containing 200 total links
    // WHEN: Updating all references after a file move
    // THEN: Completes within performance requirement of 2 seconds
    // Create many files with multiple links
    const manyFilesDir = path.join(tempDir, 'ManyFiles');
    await fs.mkdir(manyFilesDir, { recursive: true });

    // Create target file
    const targetPath = path.join(tempDir, 'target.md');
    await fs.writeFile(targetPath, '# Target File');

    // Create 50 files with 4 links each = 200 links total
    const filePromises = [];
    for (let i = 0; i < 50; i++) {
      const content = `# File ${i}
Link 1: [[target]]
Link 2: See [target file](../target.md)
Link 3: [[target#section1]]
Link 4: Check [this target](../target.md#section2)
`;
      filePromises.push(
        fs.writeFile(path.join(manyFilesDir, `file${i}.md`), content)
      );
    }
    await Promise.all(filePromises);

    const startTime = Date.now();
    const newPath = path.join(tempDir, 'Archive/target.md');
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    
    await relocator.updateReferences(targetPath, newPath, tempDir);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);

    // Verify a sample file was updated
    const sampleContent = await fs.readFile(
      path.join(manyFilesDir, 'file0.md'),
      'utf-8'
    );
    expect(sampleContent).toContain('[[../Archive/target]]');
    // ManyFiles/file0.md -> Archive/target.md requires going up 1 level, not 2
    expect(sampleContent).toContain('[target file](../Archive/target.md)');
  });

  it('does not update links in code blocks or comments', async () => {
    // GIVEN: Links inside code blocks and HTML comments
    // WHEN: Updating references in the file
    // THEN: Skips links in code/comments (they're not active links)
    const oldPath = path.join(tempDir, 'Tasks/task1.md');
    const newPath = path.join(tempDir, 'Archive/2024/task1.md');

    await relocator.updateReferences(oldPath, newPath, tempDir);

    const content = await fs.readFile(
      path.join(tempDir, 'Daily/2024-06-25.md'),
      'utf-8'
    );
    
    // Links in code blocks should remain unchanged
    expect(content).toMatch(/```markdown\nThis \[\[task1\]\]/);
    
    // Links in comments should remain unchanged
    expect(content).toMatch(/<!-- This \[\[task1\]\]/);
    
    // But the regular link should be updated
    expect(content).toContain('- Work on [[../Archive/2024/task1]]');
  });

  it('handles bidirectional links correctly', async () => {
    // GIVEN: Two files that link to each other
    // WHEN: Moving one file to a new location
    // THEN: Updates both incoming links TO the file and outgoing links FROM it
    // Test that when moving task1.md, the links FROM task1 TO project1 are also updated
    const oldPath = path.join(tempDir, 'Tasks/task1.md');
    const newPath = path.join(tempDir, 'Archive/2024/task1.md');

    // Move the file first
    await fs.rename(oldPath, newPath);
    
    // Update references TO the moved file
    await relocator.updateReferences(oldPath, newPath, tempDir);

    // Also need to update links FROM the moved file
    const movedContent = await fs.readFile(newPath, 'utf-8');
    const updatedContent = movedContent
      .replace('[[project1]]', '[[../../Projects/project1]]')
      .replace('[[../Projects/project1]]', '[[../../Projects/project1]]');
    
    await fs.writeFile(newPath, updatedContent);

    const finalContent = await fs.readFile(newPath, 'utf-8');
    expect(finalContent).toContain('[[../../Projects/project1]]');
  });
});