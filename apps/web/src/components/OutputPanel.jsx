import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Download, HelpCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

const OUTPUT_FORMATS = [
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
  { value: 'yaml', label: 'YAML', description: 'YAML Ain\'t Markup Language' },
  { value: 'csv', label: 'CSV', description: 'Comma-Separated Values' },
  { value: 'markdown', label: 'Markdown Table', description: 'GitHub-flavored Markdown' },
];

// eslint-disable-next-line no-unused-vars
export function OutputPanel({ selectedDocuments = [], onFormatChange }) {
  const [format, setFormat] = useState('json');
  
  const handleFormatChange = (newFormat) => {
    setFormat(newFormat);
    if (onFormatChange) {
      onFormatChange(newFormat);
    }
  };
  
  const [options, setOptions] = useState({
    json: { prettyPrint: true, indent: 2 },
    yaml: { indent: 2 },
    csv: { delimiter: ',', includeHeaders: true },
    markdown: { alignColumns: true },
  });

  const updateOption = (format, key, value) => {
    setOptions(prev => ({
      ...prev,
      [format]: {
        ...prev[format],
        [key]: value,
      },
    }));
  };

  const getPreview = () => {
    // Sample data for preview
    const sampleData = [
      { name: 'example.md', path: '/vault/docs/example.md', modified: '2025-07-29', size: 1024 },
      { name: 'readme.md', path: '/vault/readme.md', modified: '2025-07-28', size: 2048 },
    ];

    switch (format) {
      case 'json':
        return options.json.prettyPrint
          ? JSON.stringify(sampleData, null, options.json.indent)
          : JSON.stringify(sampleData);
      
      case 'yaml':
        // Simple YAML representation
        return sampleData.map(item => 
          `- name: ${item.name}\n` +
          `  path: ${item.path}\n` +
          `  modified: ${item.modified}\n` +
          `  size: ${item.size}`
        ).join('\n');
      
      case 'csv':
        const delimiter = options.csv.delimiter;
        const headers = options.csv.includeHeaders 
          ? `name${delimiter}path${delimiter}modified${delimiter}size\n` 
          : '';
        const csvRows = sampleData.map(item => 
          `${item.name}${delimiter}${item.path}${delimiter}${item.modified}${delimiter}${item.size}`
        ).join('\n');
        return headers + csvRows;
      
      case 'markdown':
        const header = '| Name | Path | Modified | Size |\n|------|------|----------|------|\n';
        const mdRows = sampleData.map(item => 
          `| ${item.name} | ${item.path} | ${item.modified} | ${item.size} |`
        ).join('\n');
        return header + mdRows;
      
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Format Selection */}
      <div>
        <div className="text-xs font-medium mb-2 block">Output Format</div>
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_FORMATS.map((fmt) => (
              <SelectItem key={fmt.value} value={fmt.value}>
                <div>
                  <div className="font-medium">{fmt.label}</div>
                  <div className="text-xs text-muted-foreground">{fmt.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format-specific Options */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="text-xs font-medium">Options</div>
          <HelpCircle className="h-3 w-3 text-muted-foreground" title="Configure format-specific options" />
        </div>

        {format === 'json' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pretty-print"
                checked={options.json.prettyPrint}
                onCheckedChange={(checked) => updateOption('json', 'prettyPrint', checked)}
              />
              <label
                htmlFor="pretty-print"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Pretty print
              </label>
            </div>
            {options.json.prettyPrint && (
              <div className="flex items-center gap-2 ml-6">
                <label htmlFor="indent" className="text-xs">Indent:</label>
                <Input
                  id="indent"
                  type="number"
                  min="1"
                  max="8"
                  value={options.json.indent}
                  onChange={(e) => updateOption('json', 'indent', parseInt(e.target.value))}
                  className="w-16 h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">spaces</span>
              </div>
            )}
          </div>
        )}

        {format === 'yaml' && (
          <div className="flex items-center gap-2">
            <label htmlFor="yaml-indent" className="text-xs">Indent:</label>
            <Input
              id="yaml-indent"
              type="number"
              min="1"
              max="8"
              value={options.yaml.indent}
              onChange={(e) => updateOption('yaml', 'indent', parseInt(e.target.value))}
              className="w-16 h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">spaces</span>
          </div>
        )}

        {format === 'csv' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="delimiter" className="text-xs">Delimiter:</label>
              <Select
                value={options.csv.delimiter}
                onValueChange={(value) => updateOption('csv', 'delimiter', value)}
              >
                <SelectTrigger className="w-32 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-headers"
                checked={options.csv.includeHeaders}
                onCheckedChange={(checked) => updateOption('csv', 'includeHeaders', checked)}
              />
              <label
                htmlFor="include-headers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include headers
              </label>
            </div>
          </div>
        )}

        {format === 'markdown' && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="align-columns"
              checked={options.markdown.alignColumns}
              onCheckedChange={(checked) => updateOption('markdown', 'alignColumns', checked)}
            />
            <label
              htmlFor="align-columns"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Align columns
            </label>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">Preview</div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={() => navigator.clipboard.writeText(getPreview())}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={() => {
                // TODO: Implement download functionality
                logger.info('Download clicked');
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
          {getPreview()}
        </pre>
      </div>
    </div>
  );
}