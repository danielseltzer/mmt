# shadcn/ui Implementation Plan for MMT

## Executive Summary

This plan outlines the integration of shadcn/ui into the MMT web application to establish a professional, accessible UI foundation. The current app uses basic CSS and could benefit significantly from a modern component library.

## Current State Analysis

### Existing Architecture
- **Framework**: React 19.1.0 + Vite 6.3.5
- **Styling**: Plain CSS with basic styles
- **State**: Zustand for document management
- **Table**: Custom TableView using TanStack Table + React Virtual
- **TypeScript**: Configured with strict mode
- **Monorepo**: pnpm workspaces with Turbo

### Pain Points
- No design system or consistent styling
- Basic form controls and interactions
- Limited component library
- Manual styling for every UI element
- No accessibility considerations
- Hard to maintain visual consistency

## Implementation Strategy

### Phase 1: Foundation Setup (Day 1-2)

#### 1.1 Install and Configure shadcn/ui

**Dependencies to Add:**
```json
{
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1", // Already exists
    "lucide-react": "^0.468.0",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.16",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.2"
  }
}
```

**Installation Steps:**
```bash
# Navigate to web app
cd apps/web

# Install Tailwind CSS
pnpm add -D tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-slot class-variance-authority lucide-react tailwind-merge tailwindcss-animate

# Initialize Tailwind
npx tailwindcss init -p

# Initialize shadcn/ui
pnx shadcn@latest init
```

#### 1.2 Configuration Files

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**globals.css (replace existing):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**components.json:**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "./src/components",
    "utils": "./src/lib/utils"
  }
}
```

#### 1.3 TypeScript Configuration

**Update tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/entities" },
    { "path": "../../packages/table-view" }
  ]
}
```

**Update vite.config.ts:**
```typescript
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

### Phase 2: Core Components (Day 2-3)

#### 2.1 Install Essential Components

```bash
# Core UI components
pnx shadcn@latest add button
pnx shadcn@latest add input
pnx shadcn@latest add table
pnx shadcn@latest add card
pnx shadcn@latest add badge
pnx shadcn@latest add separator
pnx shadcn@latest add dropdown-menu
pnx shadcn@latest add command
pnx shadcn@latest add dialog
pnx shadcn@latest add form
pnx shadcn@latest add label
pnx shadcn@latest add checkbox
pnx shadcn@latest add select
pnx shadcn@latest add toast
pnx shadcn@latest add tooltip
pnx shadcn@latest add progress
pnx shadcn@latest add skeleton
```

#### 2.2 Create Utility Functions

**src/lib/utils.ts:**
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
```

### Phase 3: Component Migration (Day 3-5)

#### 3.1 App Layout Redesign

**src/App.tsx (new):**
```typescript
import { useEffect } from 'react'
import { QueryBar } from './components/QueryBar'
import { DocumentTable } from './components/DocumentTable'
import { useDocumentStore } from './stores/document-store'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import './globals.css'

function App() {
  const fetchDocuments = useDocumentStore(state => state.fetchDocuments)
  
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold text-foreground">
            MMT - Markdown Management Toolkit
          </h1>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search and Filters */}
        <Card className="p-6">
          <QueryBar />
        </Card>
        
        <Separator />
        
        {/* Document Table */}
        <Card className="p-6">
          <DocumentTable />
        </Card>
      </main>
    </div>
  )
}

export default App
```

#### 3.2 Enhanced QueryBar Component

**src/components/QueryBar.tsx (new):**
```typescript
import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDocumentStore } from '../stores/document-store'
import { debounce } from '@/lib/utils'

interface Filter {
  id: string
  type: 'text' | 'frontmatter' | 'date' | 'path'
  label: string
  value: string
}

export function QueryBar() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filter[]>([])
  const { setSearchQuery, fetchDocuments, documentCount } = useDocumentStore()
  
  // Debounced search
  const debouncedSearch = debounce((searchQuery: string) => {
    setSearchQuery(searchQuery)
    fetchDocuments()
  }, 300)
  
  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])
  
  const addFilter = (filter: Filter) => {
    setFilters(prev => [...prev, filter])
  }
  
  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId))
  }
  
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Filter Controls */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <Command>
              <CommandInput placeholder="Search filter types..." />
              <CommandList>
                <CommandEmpty>No filter types found.</CommandEmpty>
                <CommandItem
                  onSelect={() => {
                    // Add text filter logic
                  }}
                >
                  Text Search
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    // Add frontmatter filter logic
                  }}
                >
                  Frontmatter Property
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    // Add date filter logic
                  }}
                >
                  Date Modified
                </CommandItem>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Active Filters */}
        {filters.map((filter) => (
          <Badge key={filter.id} variant="secondary" className="gap-1">
            {filter.label}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={() => removeFilter(filter.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      
      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {documentCount} documents
      </div>
    </div>
  )
}
```

#### 3.3 Enhanced Data Table

**src/components/DocumentTable.tsx (new):**
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { useDocumentStore } from '../stores/document-store'
import { formatDate, formatFileSize } from '@/lib/utils'
import type { Document } from '@mmt/entities'

export function DocumentTable() {
  const { documents, loading, error } = useDocumentStore()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        Error: {error}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="h-auto p-0 font-semibold">
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Path</TableHead>
              <TableHead>
                <Button variant="ghost" className="h-auto p-0 font-semibold">
                  Modified
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc: Document) => (
              <TableRow key={doc.path} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">
                  {doc.metadata.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doc.path}
                </TableCell>
                <TableCell>
                  {formatDate(doc.metadata.modified)}
                </TableCell>
                <TableCell>
                  {formatFileSize(doc.metadata.size)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {doc.metadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Move</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

### Phase 4: Advanced Features (Day 5-7)

#### 4.1 Command Palette Integration

```typescript
// Command palette for quick actions
pnx shadcn@latest add command

// Implementation in App.tsx
const [commandOpen, setCommandOpen] = useState(false)

// Keyboard shortcut
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setCommandOpen((open) => !open)
    }
  }
  document.addEventListener('keydown', down)
  return () => document.removeEventListener('keydown', down)
}, [])
```

#### 4.2 Advanced Data Table with Virtual Scrolling

**Migration strategy for existing TableView:**
1. Keep existing `@mmt/table-view` package for complex virtual scrolling
2. Create shadcn/ui wrapper components
3. Use shadcn/ui styling with TanStack Table logic
4. Gradual migration path

#### 4.3 Filter Builder Components

```typescript
// Form components for filter builder
pnx shadcn@latest add calendar
pnx shadcn@latest add popover
pnx shadcn@latest add select

// Advanced filtering UI components
// - Date range picker
// - Multi-select dropdowns
// - Text input with suggestions
// - Filter chip management
```

### Phase 5: Testing and Polish (Day 7-8)

#### 5.1 Accessibility Testing
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels

#### 5.2 Performance Optimization
- Bundle size analysis
- Component lazy loading
- Virtual scrolling integration
- Memoization where needed

#### 5.3 Dark Mode Support
```typescript
// Theme provider setup
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({
  theme: 'system',
  setTheme: () => null,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
      return
    }
    
    root.classList.add(theme)
  }, [theme])
  
  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
```

## Migration Strategy

### Gradual Replacement Approach
1. **Keep existing components working** during migration
2. **Create shadcn/ui versions alongside** existing components
3. **Feature flags** to toggle between old/new components
4. **Progressive enhancement** of existing functionality
5. **Maintain API compatibility** with existing packages

### Rollback Plan
- Keep original CSS files as backup
- Use git branches for safe experimentation
- Component-level rollback capability
- Gradual feature flag removal

## Benefits and ROI

### Immediate Benefits
- **Professional appearance** out of the box
- **Consistent design system** across all components
- **Accessibility compliance** built-in
- **Developer productivity** with pre-built components
- **Type safety** with full TypeScript support

### Long-term Benefits
- **Faster feature development** with component library
- **Better user experience** with polished interactions
- **Easier maintenance** with standardized patterns
- **Mobile responsiveness** built-in
- **Future-proof** architecture with modern practices

### Estimated Timeline
- **Phase 1 (Setup)**: 1-2 days
- **Phase 2 (Core Components)**: 1 day
- **Phase 3 (Migration)**: 2-3 days
- **Phase 4 (Advanced Features)**: 2 days
- **Phase 5 (Polish)**: 1 day

**Total: 7-9 days for complete implementation**

## Risk Mitigation

### Technical Risks
- **Bundle size increase**: Mitigated by tree shaking and careful component selection
- **Performance regression**: Mitigated by virtual scrolling preservation and performance testing
- **Breaking changes**: Mitigated by gradual migration and API compatibility

### Process Risks
- **Development time**: Mitigated by phased approach and clear milestones
- **Learning curve**: Mitigated by excellent documentation and community support
- **Integration issues**: Mitigated by early testing and incremental implementation

## Success Metrics

### Technical Metrics
- [ ] Bundle size < 1MB gzipped
- [ ] Performance: First Contentful Paint < 1.5s
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Type coverage: 100% TypeScript coverage

### User Experience Metrics
- [ ] Consistent visual design across all components
- [ ] Keyboard navigation for all interactive elements
- [ ] Responsive design on mobile devices
- [ ] Dark mode support

### Developer Experience Metrics
- [ ] Component reusability > 80%
- [ ] Reduced custom CSS by > 90%
- [ ] Faster feature development time
- [ ] Improved code maintainability

## Conclusion

shadcn/ui is the optimal choice for MMT's UI foundation because:

1. **Perfect fit for data-heavy applications** like MMT
2. **Copy-paste architecture** gives full control over components
3. **Built on proven technologies** (Radix UI + Tailwind CSS)
4. **Excellent TypeScript support** matches project standards
5. **Strong community and ecosystem** for long-term support
6. **Minimal bundle impact** with tree-shaking benefits
7. **Professional, modern design** that will age well

The implementation plan provides a clear, low-risk path to dramatically improve the UI while maintaining existing functionality. The gradual migration approach ensures minimal disruption to current development work while establishing a solid foundation for future features.
