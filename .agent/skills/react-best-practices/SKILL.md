---
name: react-best-practices
description: "Vercel React Best Practices: Performance, State Management, and Bundle Optimization. Use this skill to audit React code for common pitfalls like waterfalls, large bundles, and unnecessary re-renders."
---

# Vercel React Best Practices

## 1. Eliminating Waterfalls
**Impact: HIGH (avoids blocking unused code paths)**

### 1.1 Defer Await Until Needed
Move `await` operations into the branches where they're actually used to avoid blocking code paths that don't need them.

**Incorrect:**
```typescript
async function handleRequest(userId, skip) {
  const data = await fetchData(userId) // Blocks even if skipped
  if (skip) return { skipped: true }
  return process(data)
}
```

**Correct:**
```typescript
async function handleRequest(userId, skip) {
  if (skip) return { skipped: true }
  const data = await fetchData(userId) // Only fetches if needed
  return process(data)
}
```

### 1.2 Dependency-Based Parallelization
For operations with partial dependencies, use `Promise.all` or `better-all` to maximize parallelism.

### 1.4 Promise.all() for Independent Operations
When async operations have no interdependencies, execute them concurrently.

**Correct:**
```typescript
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts()
])
```

## 2. Bundle Size Optimization
**Impact: CRITICAL (200-800ms import cost)**

### 2.1 Avoid Barrel File Imports
Import directly from source files instead of barrel files (index.js re-exports) to avoid loading thousands of unused modules.

**Incorrect:**
```tsx
import { Check, X } from 'lucide-react'
import { Button } from '@mui/material'
```

**Correct:**
```tsx
import Check from 'lucide-react/dist/esm/icons/check'
import Button from '@mui/material/Button'
```
*Or use `optimizePackageImports` in Next.js config.*

### 2.2 Conditional Module Loading
Load large components or libraries only when needed using dynamic imports.

**Correct:**
```tsx
useEffect(() => {
  if (enabled) {
    import('./heavy-lib').then(mod => setLib(mod))
  }
}, [enabled])
```

## 5. Re-render Optimization
**Impact: MEDIUM (UI Responsiveness)**

### 5.1 Defer State Reads to Usage Point
Don't subscribe to dynamic state (searchParams, localStorage) at the top level if you only read it inside callbacks. Read it *inside* the callback.

**Incorrect:**
```tsx
function Button() {
  const params = useSearchParams() // Re-renders on any param change
  const handleClick = () => log(params.get('id'))
  return <button onClick={handleClick} />
}
```

**Correct:**
```tsx
function Button() {
  const handleClick = () => {
    const params = new URLSearchParams(window.location.search) // No re-render
    log(params.get('id'))
  }
  return <button onClick={handleClick} />
}
```

### 5.2 Extract to Memoized Components
Extract expensive work into components wrapped in `memo` (or trust React Compiler) to enable early returns.

### 5.3 Narrow Effect Dependencies
Specify primitive dependencies instead of objects to minimize effect re-runs.

**Incorrect:** `useEffect(..., [user])` (runs on any user field change)
**Correct:** `useEffect(..., [user.id])` (runs only when ID changes)

### 5.4 Subscribe to Derived State
Subscribe to derived boolean state instead of continuous values (like window width).

**Incorrect:** `const width = useWindowWidth()` (renders every pixel)
**Correct:** `const isMobile = useMediaQuery('(max-width: 768px)')` (renders only on breakpoint cross)
