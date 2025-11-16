# Using the MDX Editor in a Next.js 16 Project

This document provides instructions on how to integrate the MDX editor into a Next.js 16 project.

## 1. Install Dependencies

First, you need to install the `@mdxeditor/editor` package. You can use any package manager you prefer (npm, yarn, pnpm, bun):

```bash
# Using npm
npm install --save @mdxeditor/editor

# Using yarn
yarn add @mdxeditor/editor

# Using pnpm
pnpm add @mdxeditor/editor

# Using bun
bun add @mdxeditor/editor
```

## 2. Add the Editor Component

Copy the `editor.tsx` file into your project, for example, in `components/ui/editor.tsx`.

## 3. Use the Editor in a Page or any Client Component

To use the editor, you need to dynamically import it in a client component. You can place this dynamic import in any client component where you want the editor to appear. Here's an example of how to use it in your `app/page.tsx` file:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import '@mdxeditor/editor/style.css'

const Editor = dynamic(() => import('../components/ui/editor'), { ssr: false })

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">MDX Editor</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <Editor markdown={'# Hello World'} />
        </Suspense>
      </div>
    </main>
  )
}
```

## 4. Run the Development Server

Now you can run your development server to see the editor in action:

```bash
npm run dev
```