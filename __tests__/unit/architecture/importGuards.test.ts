import * as fs from 'fs';
import * as path from 'path';

function findFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'adapters') {
        findFiles(filePath, fileList);
      }
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

describe('Architectural Constraints - Import Guards', () => {
  let sourceFiles: string[] = [];

  beforeAll(() => {
    // Only check files in src/ outside of adapters/
    const srcDir = path.resolve(__dirname, '../../../src');
    const allFiles = findFiles(srcDir);
    
    // Filter out the factory itself, as it is allowed to import adapters
    sourceFiles = allFiles.filter(f => !f.endsWith('messageRepositoryFactory.ts'));
  });

  it('No file outside factory imports SupabaseMessageRepository', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect({
        file,
        leaksSupabase: content.includes('SupabaseMessageRepository') || content.includes('adapters/supabase')
      }).toEqual({
        file,
        leaksSupabase: false
      });
    }
  });

  it('No file outside factory imports InMemoryMessageRepository', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // allow test setup/mocking but assert src/ files are clean
      if (!file.includes('__tests__') && !file.includes('jest.setup.ts')) {
        expect({
          file,
          leaksInMemory: content.includes('InMemoryMessageRepository') || content.includes('adapters/inMemory')
        }).toEqual({
          file,
          leaksInMemory: false
        });
      }
    }
  });

  it('No file outside factory imports the concrete database client', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect({
        file,
        leaksSupabaseClient: content.includes('@supabase/supabase-js')
      }).toEqual({
        file,
        leaksSupabaseClient: false
      });
    }
  });
});
